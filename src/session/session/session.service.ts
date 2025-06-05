import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSessionDto, PaymentConfirmDto } from '../dto';
import { PaymentStatus, Session } from '../../../generated/prisma';

// Helper function for retry delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);
    private readonly MAX_BILL_ID_RETRIES = 3;
    private readonly BILL_ID_RETRY_DELAY_MS = 50;
    private readonly SESSION_EXPIRY_HOURS = 8;

    constructor(private readonly prisma: PrismaService) { }

    private async generateBillId(): Promise<string> {
        // Get current UTC time
        const nowUtc = new Date();
        // Convert to IST (UTC+5:30)
        const nowIst = new Date(nowUtc.getTime() + (5.5 * 60 * 60 * 1000));

        // Extract date components from the IST date using UTC methods
        const year = nowIst.getUTCFullYear();
        const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const month = monthNames[nowIst.getUTCMonth()];
        const day = String(nowIst.getUTCDate()).padStart(2, '0');

        const datePrefix = `${year}${month}${day}`;
        this.logger.log(`Generated IST datePrefix for billId: ${datePrefix}`);

        const lastSessionToday = await this.prisma.session.findFirst({
            where: { billId: { startsWith: datePrefix } },
            orderBy: { billId: 'desc' },
            select: { billId: true },
        });

        let sequenceNumber = 1;
        if (lastSessionToday && lastSessionToday.billId) {
            const lastSequenceStr = lastSessionToday.billId.substring(datePrefix.length);
            const lastSequenceNum = parseInt(lastSequenceStr, 10);
            if (!isNaN(lastSequenceNum)) {
                sequenceNumber = lastSequenceNum + 1;
            }
        }
        return `${datePrefix}${String(sequenceNumber)}`;
    }

    async createSession(createSessionDto: CreateSessionDto):
        Promise<Pick<Session, 'sessionId' | 'billId' | 'paymentStatus'> | { sessionStatus: string }> {
        this.logger.log(`Attempting to create/verify session for: ${JSON.stringify(createSessionDto)}`);

        const latestSession = await this.prisma.session.findFirst({
            where: {
                customerNumber: createSessionDto.mobileNum,
                restaurantId: createSessionDto.restaurantId,
                tableId: createSessionDto.tableId,
            },
            orderBy: {
                sessionStart: 'desc',
            },
            select: {
                sessionId: true,
                billId: true,
                paymentStatus: true,
                sessionStatus: true,
                sessionStart: true,
            }
        });

        if (latestSession) {
            this.logger.log(`Found latest session: ${latestSession.sessionId} (status: ${latestSession.sessionStatus}, payment: ${latestSession.paymentStatus}) started at ${latestSession.sessionStart}`);
            const sessionAgeHours = (Date.now() - new Date(latestSession.sessionStart).getTime()) / (1000 * 60 * 60);
            this.logger.log(`Calculated session age: ${sessionAgeHours.toFixed(2)} hours. Current server time (for Date.now()): ${new Date().toISOString()}`);

            if (latestSession.paymentStatus === PaymentStatus.Pending && latestSession.sessionStatus !== 'Expired') {
                if (sessionAgeHours >= 0 && sessionAgeHours <= this.SESSION_EXPIRY_HOURS) {
                    this.logger.log('Latest pending session is active. Returning its details.');
                    return {
                        sessionId: latestSession.sessionId,
                        billId: latestSession.billId,
                        paymentStatus: latestSession.paymentStatus,
                    };
                } else {
                    this.logger.log('Latest pending session is too old or from the future. Marking as Expired and NotCompleted.');
                    await this.prisma.session.update({
                        where: { sessionId: latestSession.sessionId },
                        data: {
                            sessionStatus: 'Expired',
                            paymentStatus: PaymentStatus.NotCompleted,
                            sessionEnd: new Date(),
                        },
                    });
                    return { sessionStatus: 'Expired' };
                }
            }

            if (latestSession.sessionStatus === 'Expired' ||
                latestSession.paymentStatus === PaymentStatus.Confirmed ||
                latestSession.paymentStatus === PaymentStatus.Failed ||
                latestSession.paymentStatus === PaymentStatus.NotCompleted) {
                this.logger.log('Latest session is already in a terminal state (Expired/Confirmed/Failed/NotCompleted). Proceeding to create a new session.');
            }

        } else {
            this.logger.log('No previous session found. Proceeding to create a new session.');
        }

        this.logger.log('Creating a new session.');
        let retries = 0;
        while (retries < this.MAX_BILL_ID_RETRIES) {
            try {
                const billId = await this.generateBillId();
                this.logger.log(`Generated billId: ${billId} (Attempt ${retries + 1})`);

                const newSession = await this.prisma.session.create({
                    data: {
                        billId: billId,
                        restaurantId: createSessionDto.restaurantId,
                        customerNumber: createSessionDto.mobileNum,
                        tableId: createSessionDto.tableId,
                    },
                });
                this.logger.log(`New session created successfully: ${newSession.sessionId}`);
                return {
                    sessionId: newSession.sessionId,
                    billId: newSession.billId,
                    paymentStatus: newSession.paymentStatus,
                };
            } catch (error) {
                if (error.code === 'P2002' && error.meta?.target?.includes('billId')) {
                    retries++;
                    this.logger.warn(`BillId unique constraint violation for billId. Retry attempt ${retries}/${this.MAX_BILL_ID_RETRIES}.`);
                    if (retries < this.MAX_BILL_ID_RETRIES) {
                        await delay(this.BILL_ID_RETRY_DELAY_MS);
                        continue;
                    } else {
                        this.logger.error(`Failed to generate unique Bill ID after ${this.MAX_BILL_ID_RETRIES} retries.`);
                        throw new InternalServerErrorException('Failed to generate unique Bill ID. Please try again later.');
                    }
                }
                this.logger.error(`Failed to create new session: ${error.message}`, error.stack);
                if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
                    throw error;
                }
                throw new BadRequestException('Could not create session.');
            }
        }
        this.logger.error('Exhausted createSession retries without returning or throwing specific error.');
        throw new InternalServerErrorException('Could not create session after multiple attempts.');
    }

    async paymentConfirm(paymentConfirmDto: PaymentConfirmDto): Promise<{ sessionId: string; billId: string; paymentStatus: PaymentStatus }> {
        const expectedPaymentKey = process.env.PAYMENT_CONF_KEY;
        if (!expectedPaymentKey) {
            this.logger.error('PAYMENT_CONF_KEY is not set in environment variables.');
            throw new InternalServerErrorException('Payment confirmation system configuration error.');
        }

        if (paymentConfirmDto.signedPaymentKey !== expectedPaymentKey) {
            this.logger.warn(`Invalid signedPaymentKey received. Expected: ${expectedPaymentKey}, Received: ${paymentConfirmDto.signedPaymentKey}`);
            throw new UnauthorizedException('Invalid payment confirmation key.');
        }

        try {
            const existingSession = await this.prisma.session.findUnique({
                where: { sessionId: paymentConfirmDto.sessionId },
                select: {
                    sessionId: true,
                    billId: true,
                    paymentStatus: true,
                    sessionStatus: true,
                }
            });

            if (!existingSession) {
                throw new NotFoundException('Session not found.');
            }

            if (existingSession.paymentStatus !== PaymentStatus.Pending) {
                throw new BadRequestException(`Session payment status is ${existingSession.paymentStatus}, not Pending.`);
            }
            if (existingSession.sessionStatus === 'Expired') {
                throw new BadRequestException('Cannot confirm payment for an Expired session.');
            }

            const updatedSession = await this.prisma.session.update({
                where: { sessionId: paymentConfirmDto.sessionId },
                data: {
                    paymentStatus: PaymentStatus.Confirmed,
                    sessionStatus: 'Completed',
                    sessionEnd: new Date(),
                },
            });

            return {
                sessionId: updatedSession.sessionId,
                billId: updatedSession.billId,
                paymentStatus: updatedSession.paymentStatus,
            };
        } catch (error) {
            this.logger.error(`Failed to confirm payment: ${error.message}`, error.stack);
            if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof UnauthorizedException) {
                throw error; // Re-throw specific known errors
            }
            // For other errors, wrap them in a generic exception or handle as appropriate
            throw new InternalServerErrorException('Could not confirm payment due to an unexpected error.');
        }
    }
}

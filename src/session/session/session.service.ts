import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateSessionDto, PaymentConfirmDto } from '../dto';
import { PaymentStatus, Session } from '../../../generated/prisma';
import { ConfigService } from '@nestjs/config';

// Helper function for retry delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) { }

    private get maxBillIdRetries(): number {
        return this.configService.get<number>('MAX_BILL_ID_RETRIES', 3);
    }

    private get billIdRetryDelayMs(): number {
        return this.configService.get<number>('BILL_ID_RETRY_DELAY_MS', 50);
    }

    private get sessionExpiryHours(): number {
        return this.configService.get<number>('SESSION_EXPIRY_HOURS', 8);
    }

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

        const sessionExpiryHoursVal = this.sessionExpiryHours;

        if (latestSession) {
            this.logger.log(`Found latest session: ${latestSession.sessionId} (status: ${latestSession.sessionStatus}, payment: ${latestSession.paymentStatus}) started at ${latestSession.sessionStart}`);
            const sessionAgeHours = (Date.now() - new Date(latestSession.sessionStart).getTime()) / (1000 * 60 * 60);
            this.logger.log(`Calculated session age: ${sessionAgeHours.toFixed(2)} hours. Current server time (for Date.now()): ${new Date().toISOString()}`);

            if (latestSession.paymentStatus === PaymentStatus.Pending && latestSession.sessionStatus !== 'Expired') {
                if (sessionAgeHours >= 0 && sessionAgeHours <= sessionExpiryHoursVal) {
                    this.logger.log('Latest pending session is active. Returning its details.');
                    return {
                        sessionId: latestSession.sessionId,
                        billId: latestSession.billId,
                        paymentStatus: latestSession.paymentStatus,
                    };
                } else {
                    this.logger.log(`OLD_PENDING_SESSION: Marking ${latestSession.sessionId} as Expired/NotCompleted due to age/future date (age ${sessionAgeHours.toFixed(2)}h vs ${sessionExpiryHoursVal}h limit).`);
                    await this.prisma.session.update({
                        where: { sessionId: latestSession.sessionId },
                        data: {
                            sessionStatus: 'Expired',
                            paymentStatus: PaymentStatus.NotCompleted,
                            sessionEnd: new Date(),
                        },
                    });
                    this.logger.log(`OLD_PENDING_SESSION: Updated ${latestSession.sessionId}. WILL NOW RETURN {sessionStatus: 'Expired'}`);
                    return { sessionStatus: 'Expired' };
                }
            }

            if (latestSession.sessionStatus === 'Expired' ||
                latestSession.paymentStatus === PaymentStatus.Confirmed ||
                latestSession.paymentStatus === PaymentStatus.Failed ||
                latestSession.paymentStatus === PaymentStatus.NotCompleted) {
                this.logger.log(`Latest session (${latestSession.sessionId}) is already in a terminal state (Status: ${latestSession.sessionStatus}, Payment: ${latestSession.paymentStatus}). Will proceed to create a new session if no other path returns.`);
            } else {
                // This case implies the session exists but wasn't Pending & Active (for reuse) and wasn't already terminal. 
                // For example, payment might be Pending but sessionStatus was already 'Expired' (handled by first 'if' not triggering).
                // Or some other combination not leading to reuse. In such cases, we'd typically create a new session.
                this.logger.log(`An existing session ${latestSession.sessionId} was found but didn't match reuse criteria and wasn't definitively terminal for new creation (Status: ${latestSession.sessionStatus}, Payment: ${latestSession.paymentStatus}). Defaulting to new session creation.`);
            }

        } else {
            this.logger.log('NO_PRIOR_SESSION_FOUND: Proceeding to new session creation.');
        }

        this.logger.log('NEW_SESSION_CREATION_BLOCK_ENTERED');
        let retries = 0;
        const maxRetries = this.maxBillIdRetries;
        const retryDelay = this.billIdRetryDelayMs;

        while (retries < maxRetries) {
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
                    this.logger.warn(`BillId unique constraint violation for billId. Retry attempt ${retries}/${maxRetries}.`);
                    if (retries < maxRetries) {
                        await delay(retryDelay);
                        continue;
                    } else {
                        this.logger.error(`Failed to generate unique Bill ID after ${maxRetries} retries.`);
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
        const expectedPaymentKey = this.configService.get<string>('PAYMENT_CONF_KEY');
        if (!expectedPaymentKey) {
            this.logger.error('PAYMENT_CONF_KEY is not set in environment variables.');
            throw new InternalServerErrorException('Payment confirmation system configuration error.');
        }

        if (paymentConfirmDto.signedPaymentKey !== expectedPaymentKey) {
            this.logger.warn(`Invalid signedPaymentKey received. Expected key (length): ${expectedPaymentKey.length}, Received key (length): ${paymentConfirmDto.signedPaymentKey.length}`);
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
                throw error;
            }
            throw new InternalServerErrorException('Could not confirm payment due to an unexpected error.');
        }
    }
}

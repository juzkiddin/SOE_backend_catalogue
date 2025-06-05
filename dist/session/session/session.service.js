"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SessionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma.service");
const prisma_1 = require("../../../generated/prisma");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let SessionService = SessionService_1 = class SessionService {
    prisma;
    logger = new common_1.Logger(SessionService_1.name);
    MAX_BILL_ID_RETRIES = 3;
    BILL_ID_RETRY_DELAY_MS = 50;
    SESSION_EXPIRY_HOURS = 8;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateBillId() {
        const nowUtc = new Date();
        const nowIst = new Date(nowUtc.getTime() + (5.5 * 60 * 60 * 1000));
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
    async createSession(createSessionDto) {
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
            if (latestSession.paymentStatus === prisma_1.PaymentStatus.Pending && latestSession.sessionStatus !== 'Expired') {
                if (sessionAgeHours >= 0 && sessionAgeHours <= this.SESSION_EXPIRY_HOURS) {
                    this.logger.log('Latest pending session is active. Returning its details.');
                    return {
                        sessionId: latestSession.sessionId,
                        billId: latestSession.billId,
                        paymentStatus: latestSession.paymentStatus,
                    };
                }
                else {
                    this.logger.log('Latest pending session is too old or from the future. Marking as Expired and NotCompleted.');
                    await this.prisma.session.update({
                        where: { sessionId: latestSession.sessionId },
                        data: {
                            sessionStatus: 'Expired',
                            paymentStatus: prisma_1.PaymentStatus.NotCompleted,
                            sessionEnd: new Date(),
                        },
                    });
                    return { sessionStatus: 'Expired' };
                }
            }
            if (latestSession.sessionStatus === 'Expired' ||
                latestSession.paymentStatus === prisma_1.PaymentStatus.Confirmed ||
                latestSession.paymentStatus === prisma_1.PaymentStatus.Failed ||
                latestSession.paymentStatus === prisma_1.PaymentStatus.NotCompleted) {
                this.logger.log('Latest session is already in a terminal state (Expired/Confirmed/Failed/NotCompleted). Proceeding to create a new session.');
            }
        }
        else {
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
            }
            catch (error) {
                if (error.code === 'P2002' && error.meta?.target?.includes('billId')) {
                    retries++;
                    this.logger.warn(`BillId unique constraint violation for billId. Retry attempt ${retries}/${this.MAX_BILL_ID_RETRIES}.`);
                    if (retries < this.MAX_BILL_ID_RETRIES) {
                        await delay(this.BILL_ID_RETRY_DELAY_MS);
                        continue;
                    }
                    else {
                        this.logger.error(`Failed to generate unique Bill ID after ${this.MAX_BILL_ID_RETRIES} retries.`);
                        throw new common_1.InternalServerErrorException('Failed to generate unique Bill ID. Please try again later.');
                    }
                }
                this.logger.error(`Failed to create new session: ${error.message}`, error.stack);
                if (error instanceof common_1.BadRequestException || error instanceof common_1.InternalServerErrorException) {
                    throw error;
                }
                throw new common_1.BadRequestException('Could not create session.');
            }
        }
        this.logger.error('Exhausted createSession retries without returning or throwing specific error.');
        throw new common_1.InternalServerErrorException('Could not create session after multiple attempts.');
    }
    async paymentConfirm(paymentConfirmDto) {
        const expectedPaymentKey = process.env.PAYMENT_CONF_KEY;
        if (!expectedPaymentKey) {
            this.logger.error('PAYMENT_CONF_KEY is not set in environment variables.');
            throw new common_1.InternalServerErrorException('Payment confirmation system configuration error.');
        }
        if (paymentConfirmDto.signedPaymentKey !== expectedPaymentKey) {
            this.logger.warn(`Invalid signedPaymentKey received. Expected: ${expectedPaymentKey}, Received: ${paymentConfirmDto.signedPaymentKey}`);
            throw new common_1.UnauthorizedException('Invalid payment confirmation key.');
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
                throw new common_1.NotFoundException('Session not found.');
            }
            if (existingSession.paymentStatus !== prisma_1.PaymentStatus.Pending) {
                throw new common_1.BadRequestException(`Session payment status is ${existingSession.paymentStatus}, not Pending.`);
            }
            if (existingSession.sessionStatus === 'Expired') {
                throw new common_1.BadRequestException('Cannot confirm payment for an Expired session.');
            }
            const updatedSession = await this.prisma.session.update({
                where: { sessionId: paymentConfirmDto.sessionId },
                data: {
                    paymentStatus: prisma_1.PaymentStatus.Confirmed,
                    sessionStatus: 'Completed',
                    sessionEnd: new Date(),
                },
            });
            return {
                sessionId: updatedSession.sessionId,
                billId: updatedSession.billId,
                paymentStatus: updatedSession.paymentStatus,
            };
        }
        catch (error) {
            this.logger.error(`Failed to confirm payment: ${error.message}`, error.stack);
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException || error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.InternalServerErrorException('Could not confirm payment due to an unexpected error.');
        }
    }
};
exports.SessionService = SessionService;
exports.SessionService = SessionService = SessionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SessionService);
//# sourceMappingURL=session.service.js.map
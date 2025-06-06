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
const config_1 = require("@nestjs/config");
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let SessionService = SessionService_1 = class SessionService {
    prisma;
    configService;
    logger = new common_1.Logger(SessionService_1.name);
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    get maxBillIdRetries() {
        return this.configService.get('MAX_BILL_ID_RETRIES', 3);
    }
    get billIdRetryDelayMs() {
        return this.configService.get('BILL_ID_RETRY_DELAY_MS', 50);
    }
    get sessionExpiryHours() {
        return this.configService.get('SESSION_EXPIRY_HOURS', 8);
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
        const sessionExpiryHoursVal = this.sessionExpiryHours;
        if (latestSession) {
            this.logger.log(`Found latest session: ${latestSession.sessionId} (status: ${latestSession.sessionStatus}, payment: ${latestSession.paymentStatus}) started at ${latestSession.sessionStart}`);
            const sessionAgeHours = (Date.now() - new Date(latestSession.sessionStart).getTime()) / (1000 * 60 * 60);
            this.logger.log(`Calculated session age: ${sessionAgeHours.toFixed(2)} hours. Current server time (for Date.now()): ${new Date().toISOString()}`);
            if (latestSession.paymentStatus === prisma_1.PaymentStatus.Pending && latestSession.sessionStatus !== 'Expired') {
                if (sessionAgeHours >= 0 && sessionAgeHours <= sessionExpiryHoursVal) {
                    this.logger.log('Latest pending session is active. Returning its details.');
                    return {
                        sessionId: latestSession.sessionId,
                        billId: latestSession.billId,
                        paymentStatus: latestSession.paymentStatus,
                    };
                }
                else {
                    this.logger.log(`OLD_PENDING_SESSION: Marking ${latestSession.sessionId} as Expired/NotCompleted due to age/future date (age ${sessionAgeHours.toFixed(2)}h vs ${sessionExpiryHoursVal}h limit).`);
                    await this.prisma.session.update({
                        where: { sessionId: latestSession.sessionId },
                        data: {
                            sessionStatus: 'Expired',
                            paymentStatus: prisma_1.PaymentStatus.NotCompleted,
                            sessionEnd: new Date(),
                        },
                    });
                    this.logger.log(`OLD_PENDING_SESSION: Updated ${latestSession.sessionId}. WILL NOW RETURN {sessionStatus: 'Expired'}`);
                    return { sessionStatus: 'Expired' };
                }
            }
            if (latestSession.sessionStatus === 'Expired' ||
                latestSession.paymentStatus === prisma_1.PaymentStatus.Confirmed ||
                latestSession.paymentStatus === prisma_1.PaymentStatus.Failed ||
                latestSession.paymentStatus === prisma_1.PaymentStatus.NotCompleted) {
                this.logger.log(`Latest session (${latestSession.sessionId}) is already in a terminal state (Status: ${latestSession.sessionStatus}, Payment: ${latestSession.paymentStatus}). Will proceed to create a new session if no other path returns.`);
            }
            else {
                this.logger.log(`An existing session ${latestSession.sessionId} was found but didn't match reuse criteria and wasn't definitively terminal for new creation (Status: ${latestSession.sessionStatus}, Payment: ${latestSession.paymentStatus}). Defaulting to new session creation.`);
            }
        }
        else {
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
            }
            catch (error) {
                if (error.code === 'P2002' && error.meta?.target?.includes('billId')) {
                    retries++;
                    this.logger.warn(`BillId unique constraint violation for billId. Retry attempt ${retries}/${maxRetries}.`);
                    if (retries < maxRetries) {
                        await delay(retryDelay);
                        continue;
                    }
                    else {
                        this.logger.error(`Failed to generate unique Bill ID after ${maxRetries} retries.`);
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
    async checkSessionStatus(sessionStatusDto) {
        this.logger.log(`Checking status for session: ${sessionStatusDto.sessionId}`);
        const session = await this.prisma.session.findUnique({
            where: { sessionId: sessionStatusDto.sessionId },
        });
        if (!session) {
            this.logger.warn(`Session status check failed: Session ${sessionStatusDto.sessionId} not found.`);
            throw new common_1.NotFoundException(`Session with ID ${sessionStatusDto.sessionId} not found.`);
        }
        if (session.restaurantId !== sessionStatusDto.restaurantId || session.tableId !== sessionStatusDto.tableId) {
            this.logger.warn(`Session ${session.sessionId} found, but restaurant/table ID did not match request.`);
            throw new common_1.BadRequestException('Session details do not match the provided restaurant or table.');
        }
        if (session.sessionStatus === 'Expired' || session.sessionStatus === 'Completed') {
            this.logger.log(`Session ${session.sessionId} is already in a terminal state: ${session.sessionStatus}`);
            return { sessionStatus: session.sessionStatus };
        }
        const sessionExpiryHoursVal = this.sessionExpiryHours;
        const sessionAgeHours = (Date.now() - new Date(session.sessionStart).getTime()) / (1000 * 60 * 60);
        this.logger.log(`Session ${session.sessionId} age: ${sessionAgeHours.toFixed(2)} hours (limit: ${sessionExpiryHoursVal}h).`);
        if (sessionAgeHours > sessionExpiryHoursVal || sessionAgeHours < 0) {
            this.logger.log(`Session ${session.sessionId} is now considered expired. Updating status in DB.`);
            const updatedSession = await this.prisma.session.update({
                where: { sessionId: session.sessionId },
                data: {
                    sessionStatus: 'Expired',
                    paymentStatus: prisma_1.PaymentStatus.NotCompleted,
                    sessionEnd: new Date(),
                },
            });
            return { sessionStatus: updatedSession.sessionStatus };
        }
        this.logger.log(`Session ${session.sessionId} is still active.`);
        return { sessionStatus: session.sessionStatus };
    }
    async paymentConfirm(paymentConfirmDto) {
        const expectedPaymentKey = this.configService.get('PAYMENT_CONF_KEY');
        if (!expectedPaymentKey) {
            this.logger.error('PAYMENT_CONF_KEY is not set in environment variables.');
            throw new common_1.InternalServerErrorException('Payment confirmation system configuration error.');
        }
        if (paymentConfirmDto.signedPaymentKey !== expectedPaymentKey) {
            this.logger.warn(`Invalid signedPaymentKey received. Expected key (length): ${expectedPaymentKey.length}, Received key (length): ${paymentConfirmDto.signedPaymentKey.length}`);
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], SessionService);
//# sourceMappingURL=session.service.js.map
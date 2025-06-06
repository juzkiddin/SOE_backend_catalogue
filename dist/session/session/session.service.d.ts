import { PrismaService } from '../../prisma.service';
import { CreateSessionDto, PaymentConfirmDto, SessionStatusDto } from '../dto';
import { PaymentStatus, Session } from '../../../generated/prisma';
import { ConfigService } from '@nestjs/config';
export declare class SessionService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    private get maxBillIdRetries();
    private get billIdRetryDelayMs();
    private get sessionExpiryHours();
    private generateBillId;
    createSession(createSessionDto: CreateSessionDto): Promise<Pick<Session, 'sessionId' | 'billId' | 'paymentStatus'> | {
        sessionStatus: string;
    }>;
    checkSessionStatus(sessionStatusDto: SessionStatusDto): Promise<{
        sessionStatus: string;
    }>;
    paymentConfirm(paymentConfirmDto: PaymentConfirmDto): Promise<{
        sessionId: string;
        billId: string;
        paymentStatus: PaymentStatus;
    }>;
}

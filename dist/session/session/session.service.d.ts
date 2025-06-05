import { PrismaService } from '../../prisma.service';
import { CreateSessionDto, PaymentConfirmDto } from '../dto';
import { PaymentStatus, Session } from '../../../generated/prisma';
export declare class SessionService {
    private readonly prisma;
    private readonly logger;
    private readonly MAX_BILL_ID_RETRIES;
    private readonly BILL_ID_RETRY_DELAY_MS;
    private readonly SESSION_EXPIRY_HOURS;
    constructor(prisma: PrismaService);
    private generateBillId;
    createSession(createSessionDto: CreateSessionDto): Promise<Pick<Session, 'sessionId' | 'billId' | 'paymentStatus'> | {
        sessionStatus: string;
    }>;
    paymentConfirm(paymentConfirmDto: PaymentConfirmDto): Promise<{
        sessionId: string;
        billId: string;
        paymentStatus: PaymentStatus;
    }>;
}

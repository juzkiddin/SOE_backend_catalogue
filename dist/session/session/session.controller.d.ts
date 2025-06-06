import { SessionService } from './session.service';
import { CreateSessionDto, PaymentConfirmDto, SessionStatusDto } from '../dto';
import { PaymentStatus, Session } from '../../../generated/prisma';
export declare class SessionController {
    private readonly sessionService;
    constructor(sessionService: SessionService);
    createSession(createSessionDto: CreateSessionDto): Promise<Pick<Session, 'sessionId' | 'billId' | 'paymentStatus'> | {
        sessionStatus: string;
    }>;
    sessionStatus(sessionStatusDto: SessionStatusDto): Promise<{
        sessionStatus: string;
    }>;
    paymentConfirm(paymentConfirmDto: PaymentConfirmDto): Promise<{
        sessionId: string;
        billId: string;
        paymentStatus: PaymentStatus;
    }>;
}

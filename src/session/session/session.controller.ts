import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SessionService } from './session.service';
import { CreateSessionDto, PaymentConfirmDto, SessionStatusDto } from '../dto';
import { PaymentStatus, Session } from '../../../generated/prisma'; // Adjusted path relative to src/session/session/

@Controller('session')
export class SessionController {
    constructor(private readonly sessionService: SessionService) { }

    @Post('createsession')
    @HttpCode(HttpStatus.OK)
    async createSession(
        @Body() createSessionDto: CreateSessionDto,
    ): Promise<Pick<Session, 'sessionId' | 'billId' | 'paymentStatus'> | { sessionStatus: string }> {
        return this.sessionService.createSession(createSessionDto);
    }

    @Post('sessionstatus')
    @HttpCode(HttpStatus.OK)
    sessionStatus(
        @Body() sessionStatusDto: SessionStatusDto,
    ): Promise<{ sessionStatus: string; paymentStatus: PaymentStatus }> {
        return this.sessionService.checkSessionStatus(sessionStatusDto);
    }

    @Post('paymentconfirm')
    @HttpCode(HttpStatus.OK)
    async paymentConfirm(
        @Body() paymentConfirmDto: PaymentConfirmDto,
    ): Promise<{ sessionId: string; billId: string; paymentStatus: PaymentStatus }> {
        return this.sessionService.paymentConfirm(paymentConfirmDto);
    }
}

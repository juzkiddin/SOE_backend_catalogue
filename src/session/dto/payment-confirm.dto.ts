import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class PaymentConfirmDto {
    @IsString()
    @IsNotEmpty()
    @IsUUID('4') // Assuming sessionId is a UUID v4
    sessionId: string;

    @IsString()
    @IsNotEmpty()
    signedPaymentKey: string;
} 
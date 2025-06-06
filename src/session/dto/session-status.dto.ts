import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class SessionStatusDto {
    @IsString()
    @IsNotEmpty()
    restaurantId: string;

    @IsString()
    @IsNotEmpty()
    @IsUUID('4')
    sessionId: string;

    @IsString()
    @IsNotEmpty()
    tableId: string;
} 
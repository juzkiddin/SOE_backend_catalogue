import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSessionDto {
    @IsString()
    @IsNotEmpty()
    mobileNum: string;

    @IsString()
    @IsNotEmpty()
    restaurantId: string;

    @IsString()
    @IsNotEmpty()
    tableId: string;
} 
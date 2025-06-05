import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class EditPortionDto {
    @IsString()
    @IsNotEmpty()
    restaurantId: string;

    @IsNumber()
    @IsNotEmpty()
    itemId: number; // Assuming this is the Item's database ID

    @IsString()
    @IsNotEmpty()
    portionName: string;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    portionPrice: number;
} 
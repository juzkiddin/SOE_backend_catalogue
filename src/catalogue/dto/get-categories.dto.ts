import { IsNotEmpty, IsString } from 'class-validator';

export class GetCategoriesDto {
    @IsString()
    @IsNotEmpty()
    restaurantId: string;
} 
import { IsNotEmpty, IsString } from 'class-validator';

export class GetCategoryIconsDto {
    @IsString()
    @IsNotEmpty()
    restaurantId: string;
} 
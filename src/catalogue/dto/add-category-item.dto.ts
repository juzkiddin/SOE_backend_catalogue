import {
    IsNotEmpty,
    IsString,
    IsBoolean,
    IsOptional,
    IsNumber,
    Min,
    ValidateIf,
    IsUrl,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
    registerDecorator,
} from 'class-validator';
import { Type } from 'class-transformer';

// Custom Validator for Price
@ValidatorConstraint({ name: 'isPriceRequired', async: false })
export class IsPriceRequiredConstraint implements ValidatorConstraintInterface {
    validate(price: number, args: ValidationArguments) {
        const object = args.object as AddCategoryItemDto;
        if (object.portionAvail === false) {
            return price !== undefined && price !== null && typeof price === 'number' && price >= 0;
        }
        return true; // If portionAvail is true, price can be optional or not provided
    }

    defaultMessage(args: ValidationArguments) {
        const object = args.object as AddCategoryItemDto;
        if (object.portionAvail === false) {
            return 'Price is required and must be a non-negative number when portions are not available.';
        }
        return 'Price validation issue.';
    }
}

export function IsPriceRequired(validationOptions?: any) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsPriceRequiredConstraint,
        });
    };
}

export class AddCategoryItemDto {
    @IsString()
    @IsNotEmpty()
    restaurantId: string;

    @IsString()
    @IsNotEmpty()
    categoryName: string;

    @IsString()
    @IsNotEmpty()
    itemName: string;

    @IsString()
    @IsOptional()
    description?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional() // Optional at the base level
    @IsPriceRequired()
    price?: number; // Conditionally required based on portionAvail

    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @Type(() => Boolean)
    @IsBoolean()
    @IsNotEmpty()
    availStatus: boolean;

    @Type(() => Boolean)
    @IsBoolean()
    @IsNotEmpty()
    portionAvail: boolean;
} 
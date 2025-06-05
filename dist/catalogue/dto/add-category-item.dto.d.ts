import { ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
export declare class IsPriceRequiredConstraint implements ValidatorConstraintInterface {
    validate(price: number, args: ValidationArguments): boolean;
    defaultMessage(args: ValidationArguments): "Price is required and must be a non-negative number when portions are not available." | "Price validation issue.";
}
export declare function IsPriceRequired(validationOptions?: any): (object: Object, propertyName: string) => void;
export declare class AddCategoryItemDto {
    restaurantId: string;
    categoryName: string;
    itemName: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    availStatus: boolean;
    portionAvail: boolean;
}

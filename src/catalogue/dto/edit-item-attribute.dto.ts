import { IsNotEmpty, IsString, IsNumber, IsIn } from 'class-validator';

// It's good practice to define which attributes are editable
// to prevent accidental or malicious updates to sensitive fields like 'id' or 'createdAt'.
const EDITABLE_ITEM_ATTRIBUTES = [
    'name',
    'description',
    'price',
    'imageUrl',
    'availStatus',
    'portionAvail',
    // 'categoryId' could be an option if you want to allow moving items between categories
    // but it requires careful handling.
];

export class EditItemAttributeDto {
    @IsString()
    @IsNotEmpty()
    restaurantId: string;

    @IsNumber()
    @IsNotEmpty()
    itemId: number; // Item's database ID

    @IsString()
    @IsNotEmpty()
    @IsIn(EDITABLE_ITEM_ATTRIBUTES, {
        message: `Attribute name must be one of the allowed attributes: ${EDITABLE_ITEM_ATTRIBUTES.join(', ')}`
    })
    attributeName: string;

    @IsNotEmpty()
    attributeValue: any; // Value will be validated in the service based on attributeName
} 
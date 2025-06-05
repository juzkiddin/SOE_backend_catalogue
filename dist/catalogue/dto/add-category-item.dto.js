"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddCategoryItemDto = exports.IsPriceRequiredConstraint = void 0;
exports.IsPriceRequired = IsPriceRequired;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
let IsPriceRequiredConstraint = class IsPriceRequiredConstraint {
    validate(price, args) {
        const object = args.object;
        if (object.portionAvail === false) {
            return price !== undefined && price !== null && typeof price === 'number' && price >= 0;
        }
        return true;
    }
    defaultMessage(args) {
        const object = args.object;
        if (object.portionAvail === false) {
            return 'Price is required and must be a non-negative number when portions are not available.';
        }
        return 'Price validation issue.';
    }
};
exports.IsPriceRequiredConstraint = IsPriceRequiredConstraint;
exports.IsPriceRequiredConstraint = IsPriceRequiredConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ name: 'isPriceRequired', async: false })
], IsPriceRequiredConstraint);
function IsPriceRequired(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsPriceRequiredConstraint,
        });
    };
}
class AddCategoryItemDto {
    restaurantId;
    categoryName;
    itemName;
    description;
    price;
    imageUrl;
    availStatus;
    portionAvail;
}
exports.AddCategoryItemDto = AddCategoryItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddCategoryItemDto.prototype, "restaurantId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddCategoryItemDto.prototype, "categoryName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddCategoryItemDto.prototype, "itemName", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AddCategoryItemDto.prototype, "description", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    IsPriceRequired(),
    __metadata("design:type", Number)
], AddCategoryItemDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], AddCategoryItemDto.prototype, "imageUrl", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Boolean)
], AddCategoryItemDto.prototype, "availStatus", void 0);
__decorate([
    (0, class_transformer_1.Type)(() => Boolean),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Boolean)
], AddCategoryItemDto.prototype, "portionAvail", void 0);
//# sourceMappingURL=add-category-item.dto.js.map
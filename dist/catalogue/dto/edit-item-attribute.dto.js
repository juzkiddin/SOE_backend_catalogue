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
exports.EditItemAttributeDto = void 0;
const class_validator_1 = require("class-validator");
const EDITABLE_ITEM_ATTRIBUTES = [
    'name',
    'description',
    'price',
    'imageUrl',
    'availStatus',
    'portionAvail',
];
class EditItemAttributeDto {
    restaurantId;
    itemId;
    attributeName;
    attributeValue;
}
exports.EditItemAttributeDto = EditItemAttributeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], EditItemAttributeDto.prototype, "restaurantId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], EditItemAttributeDto.prototype, "itemId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsIn)(EDITABLE_ITEM_ATTRIBUTES, {
        message: `Attribute name must be one of the allowed attributes: ${EDITABLE_ITEM_ATTRIBUTES.join(', ')}`
    }),
    __metadata("design:type", String)
], EditItemAttributeDto.prototype, "attributeName", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Object)
], EditItemAttributeDto.prototype, "attributeValue", void 0);
//# sourceMappingURL=edit-item-attribute.dto.js.map
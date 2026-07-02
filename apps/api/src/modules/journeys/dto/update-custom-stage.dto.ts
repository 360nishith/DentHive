import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomStageDto } from './create-custom-stage.dto';

export class UpdateCustomStageDto extends PartialType(CreateCustomStageDto) {}

import { IsString, IsNotEmpty, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class RazorpayEntityDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}

export class RazorpaySubscriptionDto {
  @ValidateNested()
  @Type(() => RazorpayEntityDto)
  @IsNotEmpty()
  entity: RazorpayEntityDto;
}

export class RazorpayPayloadDto {
  @ValidateNested()
  @Type(() => RazorpaySubscriptionDto)
  @IsNotEmpty()
  subscription: RazorpaySubscriptionDto;
}

export class RazorpayWebhookDto {
  @IsString()
  @IsIn(['subscription.halted', 'subscription.charged'])
  event: string;

  @ValidateNested()
  @Type(() => RazorpayPayloadDto)
  @IsNotEmpty()
  payload: RazorpayPayloadDto;
}

import {
  ArrayMaxSize,
  IsArray, IsBoolean, IsDefined, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested
} from 'class-validator';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';
import { Type } from 'class-transformer';

export class TumblrTagsSettings {
  @IsString()
  value: string;

  @IsString()
  label: string;
}

export class TumblrSettingsDto {  
  @IsArray()
  @IsOptional()
  @ValidateNested()
  @Type(() => TumblrTagsSettings)
  tags: TumblrTagsSettings[];

  @IsString()
  blog: string

  @IsBoolean()
  enable_reblogs: boolean
}

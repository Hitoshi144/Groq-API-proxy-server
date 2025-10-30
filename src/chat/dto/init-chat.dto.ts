import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class InitChatDto {
  @IsString()
  @IsNotEmpty()
  characterName: string;

  @IsString()
  @IsNotEmpty()
  characterPersonality: string;

  @IsString()
  @IsNotEmpty()
  characterSpeechStyle: string;

  @IsString()
  @IsNotEmpty()
  characterBehavior: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  currentSituation: string;

  @IsString()
  @IsNotEmpty()
  chatRules: string;

  @IsString()
  @IsOptional()
  characterBackstory?: string;

  @IsString()
  @IsOptional()
  relationship?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  mood?: string;
}
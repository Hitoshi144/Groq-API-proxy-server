import { PartialType } from '@nestjs/mapped-types';
import { CreateAliveDto } from './create-alive.dto';

export class UpdateAliveDto extends PartialType(CreateAliveDto) {}

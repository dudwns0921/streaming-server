import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { personProviders } from './person.providers';
import { PersonService } from './person.service';
import { PersonController } from './person.controller';

@Module({
  imports: [DatabaseModule],
  providers: [...personProviders, PersonService],
  controllers: [PersonController],
})
export class PersonModule {}

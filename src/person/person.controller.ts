import { Controller, Get, Query } from '@nestjs/common';
import { PersonService } from './person.service';
import { Person } from './person.entity';

@Controller('person')
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Get('create')
  async createPerson(
    @Query('name') name: string,
    @Query('age') age: number,
  ): Promise<Person> {
    console.log(`Creating person with name: ${name}, age: ${age}`);
    return this.personService.create(name, Number(age));
  }
}

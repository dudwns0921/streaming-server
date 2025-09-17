import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Person } from './person.entity';

@Injectable()
export class PersonService {
  constructor(
    @Inject('PERSON_REPOSITORY')
    private personRepository: Repository<Person>,
  ) {}

  async findAll(): Promise<Person[]> {
    return this.personRepository.find();
  }

  async create(name: string, age: number): Promise<Person> {
    const person = this.personRepository.create({ name, age });
    return this.personRepository.save(person);
  }
}

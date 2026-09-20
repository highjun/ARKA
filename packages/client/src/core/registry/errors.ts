import { CoreError } from "#core/errors";

export class DescriptorNotFoundError extends CoreError {
  readonly id: string;
  constructor(id: string) {
    super(`No descriptor registered for id "${id}".`);
    this.id = id;
  }
}

export class DescriptorDuplicatedIdError extends CoreError {
  readonly id: string;
  constructor(id: string) {
    super(`A descriptor is already registered for id "${id}".`);
    this.id = id;
  }
}

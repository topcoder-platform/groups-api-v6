import { Injectable } from '@nestjs/common';
import { auth } from 'tc-core-library-js';

/** Obtains verified Keycloak tokens using this workload's explicit KEYCLOAK_* configuration. */
@Injectable()
export class M2MService {
  private readonly m2m = auth.m2m();

  /** Return a verified cached/new service token; rejects on configuration or issuance failure. */
  async getM2MToken(): Promise<string> {
    return this.m2m.getMachineToken();
  }
}

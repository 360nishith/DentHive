import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private adminClient: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.adminClient = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }

  async inviteUser(email: string): Promise<string> {
    const { data, error } = await this.adminClient.auth.admin.inviteUserByEmail(email);
    if (error) throw new InternalServerErrorException(error.message);
    return data.user.id;
  }

  async createUser(email: string, password?: string): Promise<string> {
    const { data, error } = await this.adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new InternalServerErrorException(error.message);
    return data.user.id;
  }

  async updateUserMetadata(authId: string, metadata: { tenantId: string; role: string }): Promise<void> {
    const { error } = await this.adminClient.auth.admin.updateUserById(authId, {
      app_metadata: metadata,
    });
    if (error) throw new InternalServerErrorException('Failed to sync tenant context');
  }

  async banUser(authId: string): Promise<void> {
    const { error } = await this.adminClient.auth.admin.updateUserById(authId, { ban_duration: '876000h' });
    if (error) throw new InternalServerErrorException('Failed to ban user in Supabase');
  }

  async deleteUser(authId: string): Promise<void> {
    const { error } = await this.adminClient.auth.admin.deleteUser(authId);
    if (error) throw new InternalServerErrorException('Failed to rollback: Could not delete user from Supabase');
  }
}

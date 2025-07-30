import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  /**
   * Send email to ambassador
   */
  static async sendToAmbassador(user: any, template: string, context: any) {
    // Replace this with real email sending logic (e.g. NestJS MailerModule)
    console.log(`📧 [Ambassador] To: ${user.email || user.username}`);
    console.log(`Template: ${template}`);
    console.log(`Context:`, context);
  }

  /**
   * Send email to admins
   */
  static async notifyAdmins(message: string) {
    // Replace with real admin email logic
    console.log(`📧 [Admins] ${message}`);
  }
}

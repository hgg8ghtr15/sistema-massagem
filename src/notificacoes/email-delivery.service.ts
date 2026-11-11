import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);
  private readonly transporter: Transporter | null;
  private readonly remetente: string | null;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST')?.trim();
    if (!host) {
      this.transporter = null;
      this.remetente = null;
      this.logger.warn(
        'SMTP não configurado; notificações internas serão salvas e os e-mails ficarão pendentes.',
      );
      return;
    }

    const portaTexto = config.get<string>('SMTP_PORT') ?? '587';
    const porta = Number(portaTexto);
    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
      throw new InternalServerErrorException(
        'A configuração SMTP_PORT deve ser uma porta válida.',
      );
    }

    const secureTexto = config.get<string>('SMTP_SECURE');
    if (secureTexto && !['true', 'false'].includes(secureTexto.toLowerCase())) {
      throw new InternalServerErrorException(
        'A configuração SMTP_SECURE deve ser true ou false.',
      );
    }
    const usuario = config.get<string>('SMTP_USER')?.trim();
    const senha = config.get<string>('SMTP_PASSWORD');
    if ((usuario && !senha) || (!usuario && senha)) {
      throw new InternalServerErrorException(
        'SMTP_USER e SMTP_PASSWORD devem ser configurados juntos.',
      );
    }

    const remetente = config.get<string>('SMTP_FROM')?.trim() || usuario;
    if (!remetente) {
      throw new InternalServerErrorException(
        'SMTP_FROM é obrigatório quando SMTP_HOST está configurado.',
      );
    }

    this.remetente = remetente;
    this.transporter = nodemailer.createTransport({
      host,
      port: porta,
      secure: secureTexto
        ? secureTexto.toLowerCase() === 'true'
        : porta === 465,
      ...(usuario && senha ? { auth: { user: usuario, pass: senha } } : {}),
    });
  }

  get configurado(): boolean {
    return this.transporter !== null;
  }

  async enviar(destinatario: string, nome: string, assunto: string, texto: string) {
    if (!this.transporter || !this.remetente) {
      throw new Error('O transporte SMTP não está configurado.');
    }

    await this.transporter.sendMail({
      from: this.remetente,
      to: destinatario,
      subject: assunto,
      text: `Olá ${nome},\n\n${texto}\n`,
    });
  }
}

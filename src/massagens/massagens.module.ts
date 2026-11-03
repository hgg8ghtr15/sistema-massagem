import { Module } from '@nestjs/common';
import { MassagensController } from './massagens.controller';
import { MassagensService } from './massagens.service';
import { AuthModule } from '../auth/auth.module';
import { MateriaisController } from './materiais.controller';
import { AdminGuard } from '../usuarios/guards/admin.guard';

@Module({
  imports: [AuthModule],
  controllers: [MassagensController, MateriaisController],
  providers: [MassagensService, AdminGuard]
})
export class MassagensModule { }

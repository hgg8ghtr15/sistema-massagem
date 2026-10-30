import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from './guards/admin.guard';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [AuthModule],
  controllers: [UsuariosController],
  providers: [UsuariosService, AdminGuard],
})
export class UsuariosModule {}

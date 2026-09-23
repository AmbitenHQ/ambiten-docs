import { Module } from "@nestjs/common";
import { AmbitenNestAdapterModule } from "@ambiten/adapter-nestjs";
import { ContextController } from "./context/context.controller";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    AmbitenNestAdapterModule.forRoot({
      tenancy: {
        header: "x-tenant-id"
      }
    }),
    UsersModule
  ],
  controllers: [ContextController]
})
export class AppModule {}

import {
  BadRequestException,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  FileInterceptor,
  MemoryStorageFile,
  UploadedFile,
} from '@blazity/nest-file-fastify';
import { UploadResponseDto } from '@/upload/upload.dto';
import { Authenticated } from '@/common/decorators/common.decorator';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @Authenticated()
  async uploadImage(
    @UploadedFile() file: MemoryStorageFile,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check file type
    if (!file.mimetype.match(/^image\/(jpeg|png|gif|webp)$/)) {
      throw new BadRequestException('Only image files are allowed');
    }

    const uploadResult = await this.uploadService.uploadFile(file, 'game-slip');

    if (uploadResult.isErr()) {
      throw new BadRequestException(uploadResult.error.message);
    }

    return {
      url: uploadResult.value,
    };
  }
}

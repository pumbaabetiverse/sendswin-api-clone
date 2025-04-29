import { ApiProperty } from '@nestjs/swagger';

export class GetSettingResponse {
  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'string',
    },
  })
  data: Record<string, string>;
}

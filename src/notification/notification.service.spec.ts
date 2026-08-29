import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { WhatsAppService } from './services/whatsapp.service';
import { NotificationProcessor } from './processors/notification.processor';
import { WhatsAppWebhookController } from './controllers/whatsapp-webhook.controller';
import { WeightVerificationService } from '../weight-verification/weight-verification.service';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bullmq';
import {
  NOTIFICATION_QUEUE,
  JOB_SEND_WEIGHT_MISMATCH_WA,
} from './notification.constants';

describe('NotificationModule Tests', () => {
  let notificationService: NotificationService;
  let whatsAppService: WhatsAppService;
  let processor: NotificationProcessor;
  let webhookController: WhatsAppWebhookController;
  let weightVerificationService: WeightVerificationService;

  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-config'),
  };

  const mockWeightVerificationService = {
    confirmWeight: jest.fn().mockResolvedValue({
      success: true,
      data: { id: 1029, weight_status: 'confirmed' },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppWebhookController],
      providers: [
        NotificationService,
        WhatsAppService,
        NotificationProcessor,
        { provide: getQueueToken(NOTIFICATION_QUEUE), useValue: mockQueue },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: WeightVerificationService,
          useValue: mockWeightVerificationService,
        },
      ],
    }).compile();

    notificationService = module.get<NotificationService>(NotificationService);
    whatsAppService = module.get<WhatsAppService>(WhatsAppService);
    processor = module.get<NotificationProcessor>(NotificationProcessor);
    webhookController = module.get<WhatsAppWebhookController>(
      WhatsAppWebhookController,
    );
    weightVerificationService = module.get<WeightVerificationService>(
      WeightVerificationService,
    );

    jest.clearAllMocks();
  });

  describe('1. NotificationService — Queueing Job', () => {
    it('harus menambahkan job mismatch ke antrian BullMQ dengan payload yang tepat', async () => {
      const payload = {
        order_id: 1029,
        customer_phone: '08123456789',
        customer_name: 'Budi Santoso',
        estimated_weight: 5.0,
        actual_weight: 6.8,
        total_amount: 68000,
      };

      const result = await notificationService.queueWeightMismatchNotification(
        payload,
      );

      expect(result.success).toBe(true);
      expect(result.job_id).toBe('job-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        JOB_SEND_WEIGHT_MISMATCH_WA,
        payload,
        expect.objectContaining({
          attempts: 3,
        }),
      );
    });
  });

  describe('2. WhatsAppService — Formatting Interactive Message', () => {
    it('harus membuat pesan interaktif tombol dengan ID tombol yang tepat', async () => {
      const payload = {
        order_id: 1029,
        customer_phone: '08123456789',
        customer_name: 'Budi Santoso',
        estimated_weight: 5.0,
        actual_weight: 6.8,
        total_amount: 68000,
      };

      const result = await whatsAppService.sendInteractiveWeightConfirmation(
        payload,
      );

      expect(result.success).toBe(true);
      expect(result.message_id).toBeDefined();
      expect(result.payload.to).toBe('08123456789');
      expect(result.payload.interactive.action.buttons).toHaveLength(2);
      expect(result.payload.interactive.action.buttons[0].reply.id).toBe(
        'WEIGHT_CONFIRM_1029',
      );
      expect(result.payload.interactive.action.buttons[1].reply.id).toBe(
        'WEIGHT_REJECT_1029',
      );
    });
  });

  describe('3. NotificationProcessor — Processing BullMQ Job', () => {
    it('harus memanggil whatsAppService saat menerima job JOB_SEND_WEIGHT_MISMATCH_WA', async () => {
      const payload = {
        order_id: 1029,
        customer_phone: '08123456789',
        estimated_weight: 5.0,
        actual_weight: 6.8,
        total_amount: 68000,
      };

      const mockJob = {
        id: 'job-123',
        name: JOB_SEND_WEIGHT_MISMATCH_WA,
        data: payload,
      } as any;

      const spy = jest.spyOn(
        whatsAppService,
        'sendInteractiveWeightConfirmation',
      );

      await processor.process(mockJob);
      expect(spy).toHaveBeenCalledWith(payload);
    });
  });

  describe('4. WhatsAppWebhookController — Handling Customer Button Clicks', () => {
    it('harus memanggil confirmWeight({ confirmed: true }) saat tombol konfirmasi ditekan (Meta format)', async () => {
      const metaPayload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      type: 'interactive',
                      interactive: {
                        button_reply: {
                          id: 'WEIGHT_CONFIRM_1029',
                          title: '✅ Setuju & Lanjutkan',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = await webhookController.handleWebhook(metaPayload);

      expect(result.success).toBe(true);
      expect(result.action).toBe('confirmed');
      expect(result.order_id).toBe(1029);
      expect(mockWeightVerificationService.confirmWeight).toHaveBeenCalledWith(
        1029,
        { confirmed: true },
      );
    });

    it('harus memanggil confirmWeight({ confirmed: false }) saat tombol tolak ditekan (Direct format)', async () => {
      const directPayload = {
        button_id: 'WEIGHT_REJECT_1029',
      };

      const result = await webhookController.handleWebhook(directPayload);

      expect(result.success).toBe(true);
      expect(result.action).toBe('rejected');
      expect(result.order_id).toBe(1029);
      expect(mockWeightVerificationService.confirmWeight).toHaveBeenCalledWith(
        1029,
        { confirmed: false },
      );
    });
  });
});

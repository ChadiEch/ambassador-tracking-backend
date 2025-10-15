import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { AmbassadorActivity } from '../entities/ambassador-activity.entity';
import { User } from '../users/entities/user.entity';
import { PostingRule } from '../posting-rules/entities/posting-rule.entity';
import { Team } from '../teams/entities/team.entity';
import { Warning } from '../warnings/entities/warning.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let activityRepo: Repository<AmbassadorActivity>;
  let userRepo: Repository<User>;
  let rulesRepo: Repository<PostingRule>;
  let teamRepo: Repository<Team>;
  let warningRepo: Repository<Warning>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(AmbassadorActivity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
              getRawOne: jest.fn().mockResolvedValue(null),
            })),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PostingRule),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Team),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(null),
            })),
          },
        },
        {
          provide: getRepositoryToken(Warning),
          useValue: {
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    activityRepo = module.get<Repository<AmbassadorActivity>>(getRepositoryToken(AmbassadorActivity));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    rulesRepo = module.get<Repository<PostingRule>>(getRepositoryToken(PostingRule));
    teamRepo = module.get<Repository<Team>>(getRepositoryToken(Team));
    warningRepo = module.get<Repository<Warning>>(getRepositoryToken(Warning));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateWeeklyCompliance', () => {
    it('should generate compliance data for ambassadors', async () => {
      // Mock data
      const mockUsers = [
        { id: '1', name: 'John Doe', instagram: 'johndoe', role: 'ambassador', active: true } as User,
      ];
      
      const mockRule = { stories_per_week: 2, posts_per_week: 1, reels_per_week: 1 } as PostingRule;
      
      jest.spyOn(userRepo, 'find').mockResolvedValue(mockUsers);
      jest.spyOn(rulesRepo, 'findOne').mockResolvedValue(mockRule);
      
      const result = await service.generateWeeklyCompliance();
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: '1',
          name: 'John Doe',
          role: 'ambassador',
          active: true,
        })
      );
    });
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Mock data
      jest.spyOn(userRepo, 'count').mockImplementation(({ where }: any) => {
        if (where.role === 'ambassador') {
          return Promise.resolve(where.active ? 8 : 10);
        }
        return Promise.resolve(0);
      });
      
      jest.spyOn(teamRepo, 'count').mockResolvedValue(3);
      jest.spyOn(warningRepo, 'count').mockResolvedValue(2);
      
      const result = await service.getDashboardStats();
      
      expect(result).toEqual(
        expect.objectContaining({
          totalAmbassadors: 10,
          activeAmbassadors: 8,
          totalTeams: 3,
          activeWarnings: 2,
        })
      );
    });
  });
});
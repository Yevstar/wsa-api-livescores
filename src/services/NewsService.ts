import { Service } from 'typedi';
import BaseService from './BaseService';
import { News } from '../models/News';
import { DeleteResult } from 'typeorm-plus';
import { isArrayPopulated } from '../utils/Utils';

@Service()
export default class NewsService extends BaseService<News> {
  modelName(): string {
    return News.name;
  }

  public async findByParam(
    entityId: number = undefined,
    entityTypeId: number = undefined,
  ): Promise<News[]> {
    let query = this.entityManager.createQueryBuilder(News, 'news').select('distinct news.*');
    if (entityId && entityTypeId) {
      query
        .andWhere('news.entityId = :entityId and news.entityTypeId = :entityTypeId', {
          entityId,
          entityTypeId,
        })
        .andWhere('news.deleted_at is null')
        .orderBy('news.updated_at', 'DESC');
    } else {
      return [];
    }
    return query.getRawMany();
  }

  public async findUserNews(
    userId: number = undefined,
    deviceId: string = undefined,
  ): Promise<News[]> {
    let result = await this.entityManager.query('call wsa.usp_get_news(?, ?)', [userId, deviceId]);
    if (isArrayPopulated(result)) {
      return result[0];
    } else {
      return [];
    }
  }

  public async findNewsByEntityId(entityId: number): Promise<any> {
    let query = this.entityManager.createQueryBuilder(News, 'news').select('distinct news.*');
    query
      .andWhere('news.entityId = :entityId', { entityId })
      .andWhere('news.entityTypeId = 1')
      .andWhere('news.deleted_at is null')
      .andWhere('news.news_expire_date is not null')
      .andWhere('news.isActive = 1')
      .andWhere('news.news_expire_date > DATE_SUB(NOW(), INTERVAL 1 DAY)')
      .orderBy('news.updated_at', 'DESC');
    return query.getRawMany();
  }

  public async softDelete(id: number): Promise<DeleteResult> {
    let query = this.entityManager.createQueryBuilder(News, 'news');
    query.andWhere('news.id = :id', { id });
    return query.softDelete().execute();
  }

  public async findTodaysNewsByEntityId(entityId: number, currentTime: Date): Promise<any> {
    let query = this.entityManager.createQueryBuilder(News, 'news').select('distinct news.*');
    query
      .andWhere('news.entityId = :entityId', { entityId })
      .andWhere('news.entityTypeId = 1')
      .andWhere('news.deleted_at is null')
      .andWhere('news.isActive = 1')
      .andWhere(
        '( news.news_expire_date >= cast(:currentTime as datetime) or news.news_expire_date is null )',
        { currentTime },
      )
      .orderBy('news.updated_at', 'DESC');
    return query.getRawMany();
  }
}

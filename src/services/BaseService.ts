import {Inject, Service} from "typedi";
import {BaseEntity, DeleteResult, EntityManager} from "typeorm-plus";
import {InjectManager} from "typeorm-plus-typedi-extensions";
import FirebaseService from "./FirebaseService";

@Service()
export default abstract class BaseService<T extends BaseEntity> {

    /// This entity manager is for database wsa
    @InjectManager()
    protected entityManager: EntityManager;

    @Inject()
    private firebaseService: FirebaseService;

    abstract modelName(): string;

    public async findById(id: number): Promise<T> {
        return this.entityManager.findOne(this.modelName(), id);
    }

    public async findByIds(ids: number[]): Promise<T[]> {
        return this.entityManager.findByIds(this.modelName(), ids);
    }

    public async createOrUpdate(model: T): Promise<T> {
        return this.entityManager.save(model);
    }

    public async batchCreateOrUpdate(model: T[]): Promise<T[]> {
        return this.entityManager.save(model).then(
        ).catch(
            console.error.bind(console)
        );
    }

    public async deleteById(id: number): Promise<DeleteResult> {
        return this.entityManager.delete(this.modelName(), id);
    }

    public async softDeleteBy(id: number): Promise<DeleteResult> {
        return this.entityManager.softDelete(this.modelName(), id);
    }

    public async delete(model: T): Promise<T> {
        return this.entityManager.remove(model);
    }

}

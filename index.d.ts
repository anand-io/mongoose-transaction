declare module 'mongoose-transaction' {
    import { Mongoose } from 'mongoose';

    namespace MongooseTransaction {}
    class MongooseTransaction {
        constructor(mongoose: Mongoose);

        insert(model: string, doc: Object): void;
        update(model: string, id: string, doc: Object): void;
        remove(model: string, id: string): void;
        run(cb: (error: Error, docs: any) => void): void
    }

    export = MongooseTransaction;
}
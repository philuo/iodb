type IDBRequestCb = () => void;

interface IDBTableIndex {
    primary: string;
    unique?: string[];
    index?: string[];
}

interface WriteResult {
    nInserted: number;
}

interface RemoveResult {
    nRemoved: number;
}

interface IDBCollectionCtrl {
    database: string;
    collection: string;
    indexes: IDBTableIndex;
    findById(id: number | string): Promise<unknown>;
    findOne(filter?: any): Promise<unknown>;
    find(filter?: any): Promise<unknown[]>;
    updateOne(data: any, cloned?: boolean): Promise<WriteResult>;
    updateMany(data: any[], cloned?: boolean): Promise<WriteResult>;
    deleteOne(filter?: any): Promise<RemoveResult>;
    deleteMany(filter?: any): Promise<RemoveResult>;
}

interface IDBCtrl {
    getCollection: (tname: string) => IDBCollectionPromise;
    close: () => void;
}

interface IDBPoolItem {
    db: IDBDatabase;
    reqQueue: IDBRequestCb[];
    promise: IDBCtrlPromise;
    tables: Record<string, IDBTableIndex>;
}

interface IDBCtrlPromise extends Promise<IDBCtrl>, IDBCtrl { }

interface IDBCollectionPromise extends Promise<IDBCollectionCtrl>, IDBCollectionCtrl { }

interface IDBConnectOpts {
    name: string;
    tables: Record<string, IDBTableIndex>;
    version?: number;
}

export function connect(opts: IDBConnectOpts): IDBCtrlPromise;

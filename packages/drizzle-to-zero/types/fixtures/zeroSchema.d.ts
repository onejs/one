export declare const zeroSchema: {
    readonly users: {
        readonly tableName: "users";
        readonly columns: {
            readonly id: {
                readonly type: "string";
            };
            readonly username: {
                readonly type: "string";
            };
            readonly email: {
                readonly type: "string";
            };
            readonly passwordHash: {
                readonly type: "string";
            };
            readonly bio: {
                readonly type: "string";
            };
            readonly avatar_url: {
                readonly type: "string";
            };
            readonly created_at: {
                readonly type: "number";
            };
        };
        readonly primaryKey: readonly ["id"];
    };
    readonly posts: {
        readonly tableName: "posts";
        readonly columns: {
            readonly id: {
                readonly type: "string";
            };
            readonly user_id: {
                readonly type: "string";
            };
            readonly content: {
                readonly type: "string";
            };
            readonly created_at: {
                readonly type: "number";
            };
        };
        readonly primaryKey: readonly ["id"];
        readonly relationships: {
            readonly user: {
                readonly source: "user_id";
                readonly dest: {
                    readonly field: "id";
                    readonly schema: () => {
                        readonly tableName: "users";
                        readonly columns: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly username: {
                                readonly type: "string";
                            };
                            readonly email: {
                                readonly type: "string";
                            };
                            readonly passwordHash: {
                                readonly type: "string";
                            };
                            readonly bio: {
                                readonly type: "string";
                            };
                            readonly avatar_url: {
                                readonly type: "string";
                            };
                            readonly created_at: {
                                readonly type: "number";
                            };
                        };
                        readonly primaryKey: readonly ["id"];
                    };
                };
            };
            readonly likes: {
                readonly source: "id";
                readonly dest: {
                    readonly field: "post_id";
                    readonly schema: () => {
                        readonly tableName: "likes";
                        readonly columns: {
                            readonly user_id: {
                                readonly type: "string";
                            };
                            readonly post_id: {
                                readonly type: "string";
                            };
                            readonly created_at: {
                                readonly type: "number";
                            };
                        };
                        readonly primaryKey: readonly ["user_id", "post_id"];
                        readonly relationships: {
                            readonly user: {
                                readonly source: "user_id";
                                readonly dest: {
                                    readonly field: "id";
                                    readonly schema: () => {
                                        readonly tableName: "users";
                                        readonly columns: {
                                            readonly id: {
                                                readonly type: "string";
                                            };
                                            readonly username: {
                                                readonly type: "string";
                                            };
                                            readonly email: {
                                                readonly type: "string";
                                            };
                                            readonly passwordHash: {
                                                readonly type: "string";
                                            };
                                            readonly bio: {
                                                readonly type: "string";
                                            };
                                            readonly avatar_url: {
                                                readonly type: "string";
                                            };
                                            readonly created_at: {
                                                readonly type: "number";
                                            };
                                        };
                                        readonly primaryKey: readonly ["id"];
                                    };
                                };
                            };
                            readonly post: {
                                readonly source: "post_id";
                                readonly dest: {
                                    readonly field: "id";
                                    readonly schema: () => any;
                                };
                            };
                        };
                    };
                };
            };
            readonly reposts: {
                readonly source: "id";
                readonly dest: {
                    readonly field: "post_id";
                    readonly schema: () => {
                        readonly tableName: "reposts";
                        readonly columns: {
                            readonly user_id: {
                                readonly type: "string";
                            };
                            readonly post_id: {
                                readonly type: "string";
                            };
                            readonly created_at: {
                                readonly type: "number";
                            };
                        };
                        readonly primaryKey: readonly ["user_id", "post_id"];
                        readonly relationships: {
                            readonly user: {
                                readonly source: "user_id";
                                readonly dest: {
                                    readonly field: "id";
                                    readonly schema: () => {
                                        readonly tableName: "users";
                                        readonly columns: {
                                            readonly id: {
                                                readonly type: "string";
                                            };
                                            readonly username: {
                                                readonly type: "string";
                                            };
                                            readonly email: {
                                                readonly type: "string";
                                            };
                                            readonly passwordHash: {
                                                readonly type: "string";
                                            };
                                            readonly bio: {
                                                readonly type: "string";
                                            };
                                            readonly avatar_url: {
                                                readonly type: "string";
                                            };
                                            readonly created_at: {
                                                readonly type: "number";
                                            };
                                        };
                                        readonly primaryKey: readonly ["id"];
                                    };
                                };
                            };
                            readonly post: {
                                readonly source: "post_id";
                                readonly dest: {
                                    readonly field: "id";
                                    readonly schema: () => any;
                                };
                            };
                        };
                    };
                };
            };
            readonly replies: {
                readonly source: "id";
                readonly dest: {
                    readonly field: "post_id";
                    readonly schema: () => {
                        readonly tableName: "replies";
                        readonly columns: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly user_id: {
                                readonly type: "string";
                            };
                            readonly post_id: {
                                readonly type: "string";
                            };
                            readonly content: {
                                readonly type: "string";
                            };
                            readonly created_at: {
                                readonly type: "number";
                            };
                        };
                        readonly primaryKey: readonly ["id"];
                        readonly relationships: {
                            readonly user: {
                                readonly source: "user_id";
                                readonly dest: {
                                    readonly field: "id";
                                    readonly schema: () => {
                                        readonly tableName: "users";
                                        readonly columns: {
                                            readonly id: {
                                                readonly type: "string";
                                            };
                                            readonly username: {
                                                readonly type: "string";
                                            };
                                            readonly email: {
                                                readonly type: "string";
                                            };
                                            readonly passwordHash: {
                                                readonly type: "string";
                                            };
                                            readonly bio: {
                                                readonly type: "string";
                                            };
                                            readonly avatar_url: {
                                                readonly type: "string";
                                            };
                                            readonly created_at: {
                                                readonly type: "number";
                                            };
                                        };
                                        readonly primaryKey: readonly ["id"];
                                    };
                                };
                            };
                            readonly post: {
                                readonly source: "post_id";
                                readonly dest: {
                                    readonly field: "id";
                                    readonly schema: () => any;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
    readonly follows: {
        readonly tableName: "follows";
        readonly columns: {
            readonly follower_id: {
                readonly type: "string";
            };
            readonly following_id: {
                readonly type: "string";
            };
            readonly created_at: {
                readonly type: "number";
            };
        };
        readonly primaryKey: readonly ["follower_id", "following_id"];
        readonly relationships: {
            readonly follower: {
                readonly source: "follower_id";
                readonly dest: {
                    readonly field: "id";
                    readonly schema: () => {
                        readonly tableName: "users";
                        readonly columns: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly username: {
                                readonly type: "string";
                            };
                            readonly email: {
                                readonly type: "string";
                            };
                            readonly passwordHash: {
                                readonly type: "string";
                            };
                            readonly bio: {
                                readonly type: "string";
                            };
                            readonly avatar_url: {
                                readonly type: "string";
                            };
                            readonly created_at: {
                                readonly type: "number";
                            };
                        };
                        readonly primaryKey: readonly ["id"];
                    };
                };
            };
            readonly following: {
                readonly source: "following_id";
                readonly dest: {
                    readonly field: "id";
                    readonly schema: () => {
                        readonly tableName: "users";
                        readonly columns: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly username: {
                                readonly type: "string";
                            };
                            readonly email: {
                                readonly type: "string";
                            };
                            readonly passwordHash: {
                                readonly type: "string";
                            };
                            readonly bio: {
                                readonly type: "string";
                            };
                            readonly avatar_url: {
                                readonly type: "string";
                            };
                            readonly created_at: {
                                readonly type: "number";
                            };
                        };
                        readonly primaryKey: readonly ["id"];
                    };
                };
            };
        };
    };
    readonly likes: {
        readonly tableName: "likes";
        readonly columns: {
            readonly user_id: {
                readonly type: "string";
            };
            readonly post_id: {
                readonly type: "string";
            };
            readonly created_at: {
                readonly type: "number";
            };
        };
        readonly primaryKey: readonly ["user_id", "post_id"];
        readonly relationships: {
            readonly user: {
                readonly source: "user_id";
                readonly dest: {
                    readonly field: "id";
                    readonly schema: () => {
                        readonly tableName: "users";
                        readonly columns: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly username: {
                                readonly type: "string";
                            };
                            readonly email: {
                                readonly type: "string";
                            };
                            readonly passwordHash: {
                                readonly type: "string";
                            };
                            readonly bio: {
                                readonly type: "string";
                            };
                            readonly avatar_url: {
                                readonly type: "string";
                            };
                            readonly created_at: {
                                readonly type: "number";
                            };
                        };
                        readonly primaryKey: readonly ["id"];
                    };
                };
            };
            readonly post: {
                readonly source: "post_id";
                readonly dest: {
                    readonly field: "id";
                    readonly schema: () => any;
                };
            };
        };
    };
    readonly reposts: {
        readonly tableName: "reposts";
        readonly columns: {
            readonly user_id: {
                readonly type: "string";
            };
            readonly post_id: {
                readonly type: "string";
            };
            readonly created_at: {
                readonly type: "number";
            };
        };
        readonly primaryKey: readonly ["user_id", "post_id"];
        readonly relationships: {
            readonly user: {
                readonly source: "user_id";
                readonly dest: {
                    readonly field: "id";
                    readonly schema: () => {
                        readonly tableName: "users";
                        readonly columns: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly username: {
                                readonly type: "string";
                            };
                            readonly email: {
                                readonly type: "string";
                            };
                            readonly passwordHash: {
                                readonly type: "string";
                            };
                            readonly bio: {
                                readonly type: "string";
                            };
                            readonly avatar_url: {
                                readonly type: "string";
                            };
                            readonly created_at: {
                                readonly type: "number";
                            };
                        };
                        readonly primaryKey: readonly ["id"];
                    };
                };
            };
            readonly post: {
                readonly source: "post_id";
                readonly dest: {
                    readonly field: "id";
                    readonly schema: () => any;
                };
            };
        };
    };
    readonly replies: {
        readonly tableName: "replies";
        readonly columns: {
            readonly id: {
                readonly type: "string";
            };
            readonly user_id: {
                readonly type: "string";
            };
            readonly post_id: {
                readonly type: "string";
            };
            readonly content: {
                readonly type: "string";
            };
            readonly created_at: {
                readonly type: "number";
            };
        };
        readonly primaryKey: readonly ["id"];
        readonly relationships: {
            readonly user: {
                readonly source: "user_id";
                readonly dest: {
                    readonly field: "id";
                    readonly schema: () => {
                        readonly tableName: "users";
                        readonly columns: {
                            readonly id: {
                                readonly type: "string";
                            };
                            readonly username: {
                                readonly type: "string";
                            };
                            readonly email: {
                                readonly type: "string";
                            };
                            readonly passwordHash: {
                                readonly type: "string";
                            };
                            readonly bio: {
                                readonly type: "string";
                            };
                            readonly avatar_url: {
                                readonly type: "string";
                            };
                            readonly created_at: {
                                readonly type: "number";
                            };
                        };
                        readonly primaryKey: readonly ["id"];
                    };
                };
            };
            readonly post: {
                readonly source: "post_id";
                readonly dest: {
                    readonly field: "id";
                    readonly schema: () => any;
                };
            };
        };
    };
};
//# sourceMappingURL=zeroSchema.d.ts.map
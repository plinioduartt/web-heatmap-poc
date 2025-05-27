import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('binary_events', {
    id: 'id',
    site: { type: 'text', notNull: true },
    path: { type: 'text', notNull: true },
    is_mobile: { type: 'boolean', notNull: true },
    compressed_data: { type: 'bytea', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });

  pgm.createTable('json_events', {
    id: 'id',
    site: { type: 'text', notNull: true },
    path: { type: 'text', notNull: true },
    is_mobile: { type: 'boolean', notNull: true },
    data: { type: 'json', notNull: true },
    created_at: { type: 'timestamp', default: pgm.func('NOW()') },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('json_events');
  pgm.dropTable('binary_events');
}

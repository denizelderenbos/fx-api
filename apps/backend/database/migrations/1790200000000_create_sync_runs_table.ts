import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sync_runs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.enum('source', ['hist', '90d', 'daily']).notNullable()
      table.timestamp('started_at').notNullable()
      table.timestamp('finished_at').nullable()
      /** Null while the run is in progress. */
      table.enum('status', ['ok', 'failed']).nullable()
      table.integer('rows_upserted').nullable()
      table.date('latest_date').nullable()
      table.text('error').nullable()

      table.index(['source', 'started_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'currencies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('code', 3).primary()
      table.string('name').notNullable()
      table.boolean('is_active').notNullable().defaultTo(false)
      table.date('first_date').nullable()
      table.date('last_date').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

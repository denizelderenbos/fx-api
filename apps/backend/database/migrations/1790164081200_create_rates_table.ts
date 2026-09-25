import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'rates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.date('date').notNullable()
      table
        .string('currency', 3)
        .notNullable()
        .references('code')
        .inTable('currencies')
        .onDelete('CASCADE')
      table.decimal('rate', 18, 8).notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.unique(['date', 'currency'])
      table.index(['currency', 'date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

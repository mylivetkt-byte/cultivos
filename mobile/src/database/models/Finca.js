import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class Finca extends Model {
  static table = 'fincas';

  @field('nombre') nombre;
  @field('id_tenant') idTenant;
  @date('updated_at') updatedAt;
}

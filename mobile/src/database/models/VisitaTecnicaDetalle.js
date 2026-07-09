import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export default class VisitaTecnicaDetalle extends Model {
  static table = 'visitas_tecnicas_detalles';
  static associations = {
    visitas_tecnicas: { type: 'belongs_to', key: 'id_visita_uuid' },
  };

  @field('id_visita_uuid') idVisitaUuid;
  @field('id_origen') idOrigen;
  @field('tabla_origen') tablaOrigen;
  @field('diagnostico') diagnostico;
  @field('tratamiento') tratamiento;
  @field('recomendaciones') recomendaciones;
  @date('updated_at') updatedAt;

  @relation('visitas_tecnicas', 'id_visita_uuid') visita;
}

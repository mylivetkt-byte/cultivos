import { Model } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';

export default class VisitaTecnica extends Model {
  static table = 'visitas_tecnicas';
  static associations = {
    visitas_tecnicas_detalles: { type: 'has_many', foreignKey: 'id_visita_uuid' },
  };

  @field('id_finca') idFinca;
  @field('modulo') modulo; // 'Ganadería', 'Piscícola', 'Cultivos'
  @date('fecha_visita') fechaVisita;
  @field('latitud') latitud;
  @field('longitud') longitud;
  @field('firma_digital') firmaDigital;
  @field('hash_auditoria') hashAuditoria;
  @field('observaciones_generales') observacionesGenerales;
  @date('updated_at') updatedAt;
  @field('_status') syncStatus;

  @children('visitas_tecnicas_detalles') detalles;
}

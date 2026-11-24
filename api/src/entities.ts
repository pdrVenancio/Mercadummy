import { Entity, PrimaryGeneratedColumn, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToOne, Index } from 'typeorm';

@Entity('usuario') export class Usuario {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column() nome:string;
 @Index({unique:true}) @Column() email:string;
 @Column({name:'senha_hash',select:false}) senhaHash:string;
 @Column({default:'CONSUMIDOR'}) papel:string;
 @Column({default:true}) ativo:boolean;
 @CreateDateColumn({name:'criado_em',type:'timestamptz'}) criadoEm:Date;
 @UpdateDateColumn({name:'atualizado_em',type:'timestamptz'}) atualizadoEm:Date;
}
@Entity('categoria') export class Categoria {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({name:'categoria_pai_id',nullable:true,type:'uuid'}) categoriaPaiId:string;
 @Column() nome:string;
 @Index({unique:true}) @Column({unique:true}) slug:string;
}
@Entity('produto') @Index(['origem','externalId'],{unique:true}) export class Produto {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({name:'anunciante_id',type:'uuid'}) anuncianteId:string;
 @Column({name:'categoria_id',type:'uuid'}) categoriaId:string;
 @ManyToOne(()=>Categoria) @JoinColumn({name:'categoria_id'}) categoria:Categoria;
 @Column() nome:string;
 @Column({type:'text',default:''}) descricao:string;
 @Column({type:'numeric',precision:12,scale:2}) preco:string;
 @Column({type:'jsonb',default:{}}) atributos:any;
 @Column({default:true}) ativo:boolean;
 @Column({name:'external_id',nullable:true}) externalId:string;
 @Column({nullable:true}) origem:string;
 @Column({name:'imagem_url',default:''}) imagemUrl:string;
 @Column({type:'jsonb',default:[]}) imagens:string[];
 @Column({name:'desconto_percentual',type:'numeric',precision:5,scale:2,nullable:true}) descontoPercentual:string;
 @Column({type:'numeric',precision:3,scale:2,nullable:true}) avaliacao:string;
 @CreateDateColumn({name:'criado_em',type:'timestamptz'}) criadoEm:Date;
 @UpdateDateColumn({name:'atualizado_em',type:'timestamptz'}) atualizadoEm:Date;
}
@Entity('estoque') export class Estoque {
 @PrimaryColumn('uuid',{name:'produto_id'}) produtoId:string;
 @Column({default:0}) quantidade:number;
 @UpdateDateColumn({name:'atualizado_em',type:'timestamptz'}) atualizadoEm:Date;
}
@Entity('endereco') export class Endereco {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({name:'usuario_id',type:'uuid'}) usuarioId:string;
 @Column() apelido:string; @Column() cep:string; @Column() logradouro:string; @Column() numero:string;
 @Column({default:''}) complemento:string; @Column() bairro:string; @Column() cidade:string; @Column({length:2}) uf:string; @Column({default:false}) principal:boolean;
}
@Entity('pedido') export class Pedido {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({name:'usuario_id',type:'uuid'}) usuarioId:string;
 @Column({default:'CRIADO'}) status:string;
 @Column({type:'numeric',precision:12,scale:2}) total:string;
 @Column({name:'endereco_entrega',type:'jsonb',default:{}}) enderecoEntrega:any;
 @CreateDateColumn({name:'criado_em',type:'timestamptz'}) criadoEm:Date;
 @UpdateDateColumn({name:'atualizado_em',type:'timestamptz'}) atualizadoEm:Date;
}
@Entity('itens_pedido') export class ItemPedido {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({name:'pedido_id',type:'uuid'}) pedidoId:string;
 @Column({name:'produto_id',type:'uuid'}) produtoId:string;
 @Column({name:'nome_produto'}) nomeProduto:string;
 @Column({name:'preco_unitario',type:'numeric',precision:12,scale:2}) precoUnitario:string;
 @Column({type:'int'}) quantidade:number;
 @Column({type:'numeric',precision:12,scale:2}) subtotal:string;
}
@Entity('pagamento') export class Pagamento {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({name:'pedido_id',type:'uuid',unique:true}) pedidoId:string;
 @Column() metodo:string;
 @Column({default:'PENDENTE'}) status:string;
 @Column({type:'numeric',precision:12,scale:2}) valor:string;
 @Column({name:'transacao_externa_id',nullable:true}) transacaoExternaId:string;
 @Column({name:'pago_em',type:'timestamptz',nullable:true}) pagoEm:Date;
}
@Entity('outbox') export class Outbox {
 @PrimaryGeneratedColumn('uuid') id:string;
 @Column({name:'tipo_agregado'}) tipoAgregado:string;
 @Column({name:'id_agregado',type:'uuid'}) idAgregado:string;
 @Column({name:'tipo_evento'}) tipoEvento:string;
 @Column({type:'jsonb'}) payload:any;
 @Column({default:'PENDENTE'}) status:string;
 @Column({default:0}) tentativas:number;
 @CreateDateColumn({name:'criado_em',type:'timestamptz'}) criadoEm:Date;
 @Column({name:'processado_em',type:'timestamptz',nullable:true}) processadoEm:Date;
}

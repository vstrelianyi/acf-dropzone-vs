import $ from 'jquery';
import Notice from 'notice.js';
import Pasteboard from 'pasteboard.js';
import Progress from 'progress.js';


module.exports = Backbone.View.extend({
	initialize: function( opt ) {
		this.params = {};

		// reset #28
		this.el.removeAttribute('id')
		this.$('.uploader-window,.moxie-shim').remove()

		this.field = opt.field;

		this.params._acfuploader = this.field.get('key');

		// console.log('FIELD:', this.field);
		// console.log('ELEMENT:', this.el );

		// #20 - add post_id and _acf_post_id
		if ( document.querySelector( '#_acf_post_id' ) ) {
			this.params._acf_post_id = document.querySelector( '#_acf_post_id' ).value;
			if ( parseInt( this.params._acf_post_id ) > 0 ) {
				this.params.post_id = this.params._acf_post_id
			}
		}

		this.notice = false;
		this.progress = false;

		this.uploader = new wp.media.view.UploaderWindow({
			controller: this,
			uploader: {
				dropzone:  this.el,
				container: this.el,
				params: this.params,
				error: ( msg, err, file ) => {
					this.fileUploadError( this.uploader, {
						message: msg,
						file: file
					} )
				}
			}
		});

		this.pasteboard = new Pasteboard({
			controller: this,
			el: this.$el.is('[data-uploader="wp"]') ? this.el : this.field.$('.acf-gallery-attachments').get(0)
		});

		return this;
	},

	// VS CODE ----------
	getCurrentRowIndex: function() {
        const imageInputElement = this.el;
        const nearestAcfRow = imageInputElement.closest('.acf-row');

        if (nearestAcfRow) {
            const parent = nearestAcfRow.parentElement;
            const allAcfRows = Array.from(parent.querySelectorAll('.acf-row:not(.acf-clone)'));
            return allAcfRows.indexOf(nearestAcfRow);
        }
        return -1;
    },
	// ---------------

	render:function() {
		$( this.uploader.render().el ).appendTo( this.el );

		this.pasteboard.render();

		return this;
	},
	ready: function() {
		this.$el
		.on('drop dragenter dragleave dragover',function(e){
			// prevent block editor file drop
			e.stopPropagation()
		})
		.on('drop',e => {
			// reset error
			this.removeNotice();
		});

		this.trigger('activate')
		this.uploader.ready();
		//
		this.uploader.uploader.uploader.bind('FilesAdded', this.filesAdded, this );
		this.uploader.uploader.uploader.bind('BeforeUpload', this.fileBeforeUpload, this );
		this.uploader.uploader.uploader.bind('UploadProgress', this.fileUploadProgress, this );
		this.uploader.uploader.uploader.bind('FileUploaded', this.fileUploaded, this );
		this.pasteboard.render();
		return this;
	},
	filesAdded: function( uploader, files ) {
		this.total = files.length;
		this.done = 0;
		//_acfuploader
		//this.notice = false;
	},
	fileBeforeUpload: function( uploader, file ) {
		this.addProgress();
		this.progress.setLabel( _.escape(file.name) );

		// VS CODE ------------
		console.log('Uploader structure:', uploader);
    	console.log('Current settings:', uploader.settings);
        // file.acf_repeater_row_index = this.getCurrentRowIndex();
    	uploader.settings.multipart_params._acf_repeater_row_index = this.getCurrentRowIndex();
		// ----------------
	},
	fileUploadProgress:function( uploader, file ) {
		this.addProgress();
		this.progress.setProgress( ( 100 * this.done + file.percent ) / this.total );
	},
	fileUploaded:function( uploader, file, response ) {
		let result;
		this.file = file;
		try {
			this.trigger('acf-dropzone-uploaded',file.attachment,this.done);
			this.done++;
			if (this.total === this.done ) {
				this.removeProgress();
			}
		} catch( err ) {
			try {
				result = JSON.parse( response.response );
				this.fileUploadError( uploader, {
					file: this.file,
					message: result.data.message
				});
			} catch ( err2 ) {
				this.fileUploadError( uploader, {
					file: this.file,
					message: response.response
				});
			}
		}
	},
	fileUploadError:function( uploader, error ) {
		this.done++;
		if (this.total === this.done ) {
			this.removeProgress();
		}
		this.trigger( 'acf-dropzone-error', error );

		this.addNotice({
			type:'error',
			bold: _.escape(error.file.name),
			message: error.message
		});
	},
	addProgress:function() {
		if ( this.progress ) {
			return this;
		}
		this.progress = new Progress();
		this.progress.render().$el.prependTo(this.el);
		return this;
	},
	removeProgress:function( percent ) {
		if ( ! this.progress ) {
			return this;
		}

		this.progress.$el.remove();
		this.progress = false;
		return this;
	},
	addNotice:function(options) {
		this.notice = new Notice(options);
		this.notice.render();
		this.notice.$el.prependTo(this.el);
		return this;
	},
	removeNotice:function(options) {
		if ( !! this.notice ) {
			this.notice.remove();
			this.notice = false;
		}
		return this;
	}
});

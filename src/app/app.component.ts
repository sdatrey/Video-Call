import {Component, OnInit} from '@angular/core';
import {AgoraClient, ClientEvent, NgxAgoraService, Stream, StreamEvent} from 'ngx-agora';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'Video-Call';
  localCallId = 'agora_local';
  remoteCalls: string[] = [];
  private client: AgoraClient;
  private localStream: Stream;
  private uid: number;
  constructor(private ngxAgoraService: NgxAgoraService) {
  }
  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.client = this.ngxAgoraService.createClient({mode: 'rtc', codec: 'h264'});
    this.assignClientHandlers();
    this.localStream = this.ngxAgoraService.createStream({streamID: this.uid, audio: true, video: true, screen: false});
    this.assignLocalHandlers();
    this.initLocalStream(() => this.join(uid => this.publish(), error => console.error(error)));
  }
  private assignLocalHandlers(): void{
    this.localStream.on(StreamEvent.MediaAccessAllowed, () => {
      console.log('accessAllowed');
    });
    this.localStream.on(StreamEvent.MediaAccessDenied, () => {
      console.log('accessDenied');
    });
  }
  private initLocalStream(onSuccess?: () => any): void{
    this.localStream.init(
      () => {
        this.localStream.play(this.localCallId);
        if (onSuccess()){
          onSuccess();
        }
      },
      error => console.error('getUserMedia failed', error)
    );
  }
  private assignClientHandlers(): void{
    this.client.on(ClientEvent.LocalStreamPublished, evt => {
      console.log('Publish local stream successfully');
    });

    this.client.on(ClientEvent.RemoteStreamAdded, evt => {
      const stream = evt.stream as Stream;
      this.client.subscribe(stream, {audio: true, video: true}, error => {
        console.log('Subscribe stream failed', error);
      });
    });

    this.client.on(ClientEvent.RemoteStreamSubscribed, evt => {
      const stream = evt.stream as Stream;
      const id = this.getRemoteId(stream);
      if (this.remoteCalls.length){
        this.remoteCalls.push(id);
        setTimeout(() => stream.play(id), 1000);
      }
    });

    this.client.on(ClientEvent.RemoteStreamRemoved, evt => {
      const stream = evt.stream as Stream;
      if (stream){
        stream.stop();
        this.remoteCalls = [];
        console.log(`Remote Stream is removed ${stream.getId()}`);
      }
    });
    this.client.on(ClientEvent.PeerLeave,  evt => {
      const stream = evt.stream as Stream;
      if (stream) {
        stream.stop();
        this.remoteCalls = this.remoteCalls.filter(call => call !== `${this.getRemoteId(stream)}`);
        console.log(`${evt.uid} left from channel`);
      }
    });
  }
  private getRemoteId(stream: Stream): string{
    return `agora_remote-${stream.getId()}`;
  }
  join(onSuccess?: (uid: number | string) => void, onFailure?: (error: Error) => void): void{
    this.client.join(null, 'foo-bar', this.uid, onSuccess, onFailure);
  }
  publish(): void{
    this.client.publish(this.localStream, error => console.log('Publish local stream error:' + error));
  }

}

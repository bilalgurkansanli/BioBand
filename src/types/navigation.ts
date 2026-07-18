import type { NavigatorScreenParams } from '@react-navigation/native';

export type InstrumentsStackParamList = {
  InstrumentsList: undefined;
  Piano: undefined;
  Drums: undefined;
  DrumMachine: undefined;
  Guitar: undefined;
  Violin: undefined;
  Pads: undefined;
};

export type RecordingsStackParamList = {
  RecordingsHome: undefined;
  StudioProject: { projectId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  ProfileSettings: undefined;
};

export type RootTabParamList = {
  Instruments: NavigatorScreenParams<InstrumentsStackParamList> | undefined;
  Recordings: NavigatorScreenParams<RecordingsStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};
